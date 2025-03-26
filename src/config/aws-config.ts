// AWS Configuration
export const awsConfig = {
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    region: import.meta.env.VITE_AWS_REGION
  },
  s3: {
    bucket: import.meta.env.VITE_AWS_BUCKET_NAME,
  }
}; 