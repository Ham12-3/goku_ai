import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});
const index = pinecone.index("quickstart");

export async function loadS3IntoPinecone(fileKey: string) {
  // obtain the pdf
}
