import AWS from "aws-sdk";
import fs from "fs";
export async function downloadFromS3(file_key: string) {
  try {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    const s3 = new AWS.S3({
      params: {
        Bucket: process.env.AWS_BUCKET_NAME,
      },
      region: "us-east-1",
    });
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: file_key,
    };

    const obj = await s3.getObject(params).promise();

    const file_name = `/tmp/pdf - ${Date.now()}.pdf`;

    fs.writeFileSync(file_name, obj.Body as Buffer);
    return file_name;
  } catch (error) {
    console.error(error);
    return null;
  }
}
