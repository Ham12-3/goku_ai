import AWS from "aws-sdk";

export async function uploadToS3(file: File) {
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

    const file_key =
      "uploads/" + Date.now().toString() + file.name.replace(" ", "-");
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: file_key,
      Body: file,
    };
    const upload = s3
      .putObject(params)
      .on("httpUploadProgress", (evt) => {
        console.log(
          "Uploading to s3....",
          parseInt(((evt.loaded * 100) / evt.total).toString()) + "%"
        );
      })
      .promise();
    await upload.then((data) => {
      console.log("successfully uploaded to S3", file_key);
    });

    return Promise.resolve({
      file_key,
      file_name: file.name,
    });
  } catch (error) {
    console.error("Error uploading to S3", error);
    return Promise.reject(error);
  }
}

export function getS3Url(file_key: string) {
  const url = `https://${process.env.AWS_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${file_key}`;

  return url;
}
