import * as AWS from 'aws-sdk';
import TranscribeService from 'aws-sdk/clients/transcribeservice';
import { toast } from 'sonner';
import { awsConfig } from '@/config/aws-config';

// AWS Credentials Type
export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

// Transcribe Result Type
export interface TranscribeResult {
  srtContent: string;
  duration: string;
  rawTranscriptData?: any;
}

// Configure AWS with credentials
export function configureAws(credentials: AwsCredentials) {
  try {
    AWS.config.update({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region
    });
    console.log("AWS configured successfully with region:", credentials.region);
  } catch (error) {
    console.error("Error configuring AWS:", error);
    toast.error("Error configuring AWS credentials");
  }
}

// Check if AWS credentials are configured
export function getAwsCredentials(): AwsCredentials {
  // Import from config instead of using require
  return awsConfig.credentials;
}

// Add retry logic for AWS operations
const retryOperation = async <T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error);
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
      }
    }
  }
  throw lastError;
};

// Add caching for transcription results
const cacheTranscriptionResult = (fileHash: string, result: TranscribeResult) => {
  const cache = JSON.parse(localStorage.getItem('transcriptionCache') || '{}');
  cache[fileHash] = {
    result,
    timestamp: Date.now()
  };
  localStorage.setItem('transcriptionCache', JSON.stringify(cache));
};

const getCachedTranscription = (fileHash: string): TranscribeResult | null => {
  const cache = JSON.parse(localStorage.getItem('transcriptionCache') || '{}');
  const entry = cache[fileHash];
  
  if (entry && Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
    return entry.result;
  }
  
  return null;
};

// Generate a simple hash for the file
const generateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Helper function to convert AWS Transcript format to SRT
function convertTranscriptToSrt(transcriptData: any): string {
  if (!transcriptData.results || !transcriptData.results.transcripts) {
    console.warn('Invalid transcript data format');
    return '';
  }
  
  console.log('Transcript data structure:', JSON.stringify({
    hasItems: !!transcriptData.results.items,
    itemCount: transcriptData.results.items?.length || 0,
    hasSpeakerLabels: !!transcriptData.results.speaker_labels,
    transcripts: transcriptData.results.transcripts
  }));
  
  // Simple approach: use the full transcript as a single subtitle
  if (transcriptData.results.transcripts && transcriptData.results.transcripts.length > 0) {
    const fullText = transcriptData.results.transcripts[0].transcript;
    
    // If there are no items with timestamps, just return the full text as one subtitle
    if (!transcriptData.results.items || transcriptData.results.items.length === 0) {
      return "1\n00:00:00,000 --> 00:05:00,000\n" + fullText + "\n\n";
    }
  }
  
  const items = transcriptData.results.items || [];
  let srtContent = '';
  let index = 1;
  let currentLine = '';
  let startTime = '';
  let endTime = '';
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (item.type === 'pronunciation') {
      if (currentLine === '') {
        startTime = item.start_time;
      }
      
      currentLine += item.alternatives[0].content + ' ';
      endTime = item.end_time;
    } else if (item.type === 'punctuation') {
      currentLine = currentLine.trim() + item.alternatives[0].content;
    }
    
    // End of sentence or last item
    const isPunctuation = item.type === 'punctuation';
    const isEndOfSentence = isPunctuation && 
      ['.', '?', '!'].includes(item.alternatives[0].content);
    const isLastItem = i === items.length - 1;
    
    if (isEndOfSentence || isLastItem) {
      if (startTime && endTime) {
        const srtStartTime = formatSrtTime(parseFloat(startTime));
        const srtEndTime = formatSrtTime(parseFloat(endTime));
        
        srtContent += `${index}\n`;
        srtContent += `${srtStartTime} --> ${srtEndTime}\n`;
        srtContent += `${currentLine.trim()}\n\n`;
        
        index++;
        currentLine = '';
        startTime = '';
      }
    }
  }
  
  // If no SRT content was generated, use the full transcript as a fallback
  if (srtContent === '' && transcriptData.results.transcripts && transcriptData.results.transcripts.length > 0) {
    const fullText = transcriptData.results.transcripts[0].transcript;
    srtContent = "1\n00:00:00,000 --> 00:05:00,000\n" + fullText + "\n\n";
  }
  
  return srtContent;
}

// Format time for SRT (00:00:00,000)
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

// Simulate transcription for demo/fallback purposes
async function simulateTranscription(file: File): Promise<TranscribeResult> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate a simple demo transcript
  const fileName = file.name.replace(/\.[^/.]+$/, "");
  const srtContent = `1
00:00:00,000 --> 00:00:05,000
This is a simulated transcription for ${fileName}.

2
00:00:05,500 --> 00:00:10,000
The actual transcription service encountered an error.

3
00:00:10,500 --> 00:00:15,000
Please check your AWS credentials and try again.

`;

  return {
    srtContent,
    duration: "0:15"
  };
}

// Transcribe audio file using AWS Transcribe
export async function transcribeAudio(file: File, language: string = 'ta-IN'): Promise<TranscribeResult> {
  const credentials = getAwsCredentials();
  
  configureAws(credentials);
  
  try {
    // Use the imported config instead of require
    const s3Config = awsConfig.s3;
    
    // Upload file to S3
    toast.info('Uploading audio to AWS S3...');
    const s3 = new AWS.S3();
    const fileKey = `transcription-inputs/${Date.now()}-${file.name}`;
    
    const uploadParams = {
      Bucket: s3Config.bucket,
      Key: fileKey,
      Body: file,
      ContentType: file.type
    };
    
    console.log('Starting S3 upload with params:', JSON.stringify({
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      ContentType: uploadParams.ContentType,
      FileSize: file.size
    }));
    
    // Use retry logic for upload
    await retryOperation(() => s3.upload(uploadParams).promise());
    console.log('S3 upload successful');
    toast.success('Audio uploaded successfully');
    
    // Start transcription job
    toast.info('Starting transcription job...');

    const transcribeService = new TranscribeService({
      apiVersion: '2017-10-26',
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });
    
    const jobName = `job-${Date.now()}`;
    const mediaUri = `s3://${uploadParams.Bucket}/${fileKey}`;
    
    // If language is set to auto, use language identification
    const transcriptionParams = {
      TranscriptionJobName: jobName,
      // Use LanguageCode if a specific language is selected, otherwise use IdentifyLanguage
      ...(language !== 'auto' 
        ? { LanguageCode: language } 
        : { IdentifyLanguage: true, LanguageOptions: ['ta-IN', 'en-US', 'hi-IN'] }),
      MediaFormat: file.name.split('.').pop()?.toLowerCase() || 'mp3',
      Media: {
        MediaFileUri: mediaUri
      },
      OutputBucketName: uploadParams.Bucket
    };
    
    console.log('Starting transcription job with params:', JSON.stringify(transcriptionParams));
    
    await transcribeService.startTranscriptionJob(transcriptionParams).promise();
    console.log('Transcription job started successfully');
    
    // Poll for job completion
    toast.info('Processing transcription...');
    let jobComplete = false;
    let transcriptionJob;
    let pollCount = 0;
    const maxPolls = 60; // Maximum number of polling attempts (5 minutes at 5-second intervals)
    
    while (!jobComplete && pollCount < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      pollCount++;
      
      console.log(`Polling for job status (attempt ${pollCount}/${maxPolls})...`);
      
      try {
        const jobResult = await transcribeService.getTranscriptionJob({
          TranscriptionJobName: jobName
        }).promise();
        
        transcriptionJob = jobResult.TranscriptionJob;
        console.log(`Job status: ${transcriptionJob?.TranscriptionJobStatus}`);
        
        if (transcriptionJob?.TranscriptionJobStatus === 'COMPLETED') {
          jobComplete = true;
          console.log('Transcription job completed successfully');
        } else if (transcriptionJob?.TranscriptionJobStatus === 'FAILED') {
          throw new Error(`Transcription job failed: ${transcriptionJob.FailureReason}`);
        }
      } catch (pollError) {
        console.error('Error polling job status:', pollError);
        // Continue polling despite errors
      }
    }
    
    if (!jobComplete) {
      throw new Error('Transcription job timed out after 5 minutes');
    }
    
    console.log('Transcription job details:', JSON.stringify(transcriptionJob));
    
    // Get the transcript
    if (transcriptionJob?.Transcript?.TranscriptFileUri) {
      console.log('Fetching transcript from:', transcriptionJob.Transcript.TranscriptFileUri);
      
      try {
        // Extract the S3 key from the TranscriptFileUri
        const transcriptUri = transcriptionJob.Transcript.TranscriptFileUri;
        
        // The URI format is typically: https://s3.REGION.amazonaws.com/BUCKET/KEY
        // We need to extract just the KEY part
        const parsedUrl = new URL(transcriptUri);
        const pathParts = parsedUrl.pathname.split('/');
        // Remove the first empty element and the bucket name
        const transcriptKey = pathParts.slice(2).join('/');
        
        console.log('Fetching transcript with key:', transcriptKey);
        
        // Use S3 getObject instead of fetch
        const transcriptObject = await s3.getObject({
          Bucket: uploadParams.Bucket,
          Key: transcriptKey
        }).promise();
        
        // Parse the JSON content from the S3 object
        const transcriptContent = transcriptObject.Body?.toString('utf-8') || '';
        const transcriptData = JSON.parse(transcriptContent);
        
        console.log('Transcript data received, converting to SRT');
        
        // Convert transcript to SRT format
        const srtContent = convertTranscriptToSrt(transcriptData);
        
        // Calculate duration from transcript items
        let maxEndTime = 0;
        if (transcriptData.results && transcriptData.results.items) {
          transcriptData.results.items.forEach((item: any) => {
            if (item.end_time && parseFloat(item.end_time) > maxEndTime) {
              maxEndTime = parseFloat(item.end_time);
            }
          });
        }
        
        const minutes = Math.floor(maxEndTime / 60);
        const seconds = Math.floor(maxEndTime % 60);
        
        return {
          srtContent,
          duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
          rawTranscriptData: transcriptData
        };
      } catch (fetchError) {
        console.error('Error fetching transcript:', fetchError);
        throw new Error('Failed to fetch transcript data: ' + (fetchError instanceof Error ? fetchError.message : String(fetchError)));
      }
    }
    
    throw new Error('Could not retrieve transcription results');
    
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Provide more detailed error messages
    let errorMessage = 'AWS Transcribe API error. Using simulation for demo.';
    if (error instanceof Error) {
      errorMessage += ` Error: ${error.message}`;
      console.log('Error stack:', error.stack);
    }
    
    toast.error(errorMessage);
    console.log('Falling back to simulation mode due to error:', error);
    
    // Log additional information that might help diagnose the issue
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    return await simulateTranscription(file);
  }
}