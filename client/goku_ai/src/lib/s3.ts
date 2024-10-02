import { PutObjectCommandOutput, S3 } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env.local" });
export async function uploadToS3(
  file: File
): Promise<{ file_key: string; file_name: string }> {
  return new Promise((resolve, reject) => {
    try {
      const s3 = new S3({
        region: "us-east-1",
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
        },
      });

      console.log("Access Key ID:", process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID);
      console.log(
        "Secret Access Key:",
        process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY
      );
      console.log("Bucket Name:", process.env.NEXT_PUBLIC_AWS_BUCKET_NAME);

      // Generate a unique file key
      const file_key = `upload/${Date.now().toString()}-${file.name.replace(
        " ",
        "-"
      )}`;

      const params = {
        Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME!,
        Key: file_key,
        Body: file,
      };

      // Upload the file to S3
      s3.putObject(
        params,
        (err: any, data: PutObjectCommandOutput | undefined) => {
          if (err) {
            console.error("Error uploading file to S3:", err);
            return reject(err); // Reject the promise on error
          }

          console.log("File uploaded successfully:", data);
          return resolve({
            file_key,
            file_name: file.name,
          });
        }
      );
    } catch (error) {
      console.error("Error in uploadToS3:", error);
      reject(error); // Reject the promise on error
    }
  });
}

export function getS3Url(file_key: string) {
  const url = `https://${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${file_key}`;
  return url;
}
