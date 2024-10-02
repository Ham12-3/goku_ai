import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import md5 from "md5";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { v4 as uuidv4 } from "uuid";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

export const getPineconeClient = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  // 1. obtain the pdf -> downlaod and read from pdf
  console.log("downloading s3 into file system");
  const file_name = await downloadFromS3(fileKey);
  if (!file_name) {
    throw new Error("could not download from s3");
  }
  console.log("loading pdf into memory" + file_name);
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  // 2. split and segment the pdf
  const documents = await Promise.all(pages.map(prepareDocument));

  console.log("SPlitted documents", documents);

  // 3. vectorise and embed individual documents
  const vectors = await Promise.all(documents.flat().map(embedDocument));

  console.log("Embedded documents", vectors);

  // 4. upload to pinecone
  const client = await getPineconeClient();
  const pineconeIndex = await client.index("gokuai");
  const namespace = pineconeIndex.namespace(convertToAscii(fileKey));

  await namespace.upsert(vectors);

  return documents[0];
}

async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as PineconeRecord;
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;

  // Remove any newline characters from the page content
  pageContent = pageContent.replace(/\n/g, "");

  // Initialize the splitter with a defined chunk size and overlap
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000, // Customize chunk size
    chunkOverlap: 200, // Overlap for better context preservation
  });

  // Prepare the document before splitting
  const document = new Document({
    pageContent,
    metadata: {
      pageNumber: metadata.loc.pageNumber,
      text: truncateStringByBytes(pageContent, 36000),
    },
  });

  // Split the document into smaller chunks
  const docs = await splitter.splitDocuments([document]);

  // Map over the split documents and assign unique IDs
  const castedSplits = docs.map((split) => ({
    pageContent: split.pageContent,
    metadata: {
      ...split.metadata,
      id: uuidv4(), // Assign a unique ID to each split
      pageContent: split.pageContent, // Include page content in metadata
    },
  }));

  // Return the processed and split documents
  return castedSplits;
}
