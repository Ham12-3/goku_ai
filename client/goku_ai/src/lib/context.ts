import { Pinecone } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./embeddings";

export async function getMatchesFromEmbeddings(
  embeddings: number[],
  fileKey: string
) {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const index = await pinecone.Index("gokuai");

  try {
    const namespace = convertToAscii(fileKey);

    // Correct query request without wrapping in queryRequest
    const queryResult = await index.query({
      topK: 5, // Set the top K most relevant matches
      vector: embeddings, // The embedding vector you want to search for
      includeMetadata: true, // Include the metadata (e.g., text, pageNumber)
      filter: { namespace: namespace }, // Use filter to isolate vectors by namespace
    });

    return queryResult.matches || [];
  } catch (error) {
    console.log("Error querying embeddings", error);
    throw error;
  }
}

export async function getContext(query: string, fileKey: string) {
  const queryEmbeddings = await getEmbeddings(query);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);

  const qualifyingDocs = matches.filter(
    (match) => match.score && match.score > 0.7
  );

  type Metadata = {
    text: string;
    pageNumber: number;
  };

  let docs = qualifyingDocs.map((match) => (match.metadata as Metadata).text);

  return docs.join("\n").substring(0, 3000);
}
