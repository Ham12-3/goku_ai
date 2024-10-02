import { S3 } from "@aws-sdk/client-s3";
import fs from "fs";
import os from "os";
import path from "path";
import * as dotenv from "dotenv";
import { pipeline } from "stream";
import { promisify } from "util"; // To use promise-based pipeline
import { Readable } from "stream"; // Import the Readable stream from Node.js

dotenv.config({ path: "../../.env.local" });

const streamPipeline = promisify(pipeline);

export async function downloadFromS3(file_key: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const s3 = new S3({
        region: "us-east-1",
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
        },
      });

      const params = {
        Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME!,
        Key: file_key,
      };

      const obj = await s3.getObject(params);

      // Check if Body is defined and is a readable stream
      if (!obj.Body || !(obj.Body instanceof Readable)) {
        return reject(new Error("S3 object body is not a readable stream"));
      }

      // Get temp directory and define the file path
      const tempDir = os.tmpdir(); // Cross-platform temp directory
      const file_name = path.join(tempDir, `${Date.now().toString()}.pdf`);

      // Create write stream for the file
      const fileStream = fs.createWriteStream(file_name);

      // Use stream pipeline to pipe S3 response to the file
      await streamPipeline(obj.Body, fileStream);

      // Resolve with the file path
      resolve(file_name);
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
}
