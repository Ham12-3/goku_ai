import { Pinecone } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});
const index = pinecone.index("quickstart");

export async function loadS3IntoPinecone(fileKey: string) {
  // obtain the pdf

  console.log("downloading s3 into our file system");

  const file_name = await downloadFromS3(fileKey);
  if (!file_name) {
    throw new Error("could not download from s3");
  }

  const loader = new PDFLoader(file_name);
  const pages = loader.load();
  return pages;
}
