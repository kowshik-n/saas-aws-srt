import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AudioWaveform } from 'lucide-react';
import { toast } from 'sonner';
import AudioUploader from '@/components/AudioUploader';
import TranscriptionResult from '@/components/TranscriptionResult';
import { transcribeAudio, getAwsCredentials, configureAws } from '@/lib/transcription';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<{
    srtContent: string;
    duration: string;
    rawTranscriptData?: any;
  } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ta-IN");

  // Configure AWS on component mount
  useEffect(() => {
    const credentials = getAwsCredentials();
    configureAws(credentials);
  }, []);

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setTranscriptionResult(null);
    
    setIsProcessing(true);
    
    try {
      const result = await transcribeAudio(file, selectedLanguage);
      setTranscriptionResult(result);
      toast.success('Transcription completed successfully');
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to transcribe audio file');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col pb-10">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute -top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-200/10 blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <header className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center justify-center mb-6 p-2 rounded-xl bg-primary/10"
          >
            <AudioWaveform className="w-6 h-6 text-primary" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-medium tracking-tight mb-3"
          >
            Audio Transcription
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto text-lg"
          >
            Upload your audio file and get accurate, time-stamped transcriptions in SRT format.
          </motion.p>
        </header>

        <div className="grid gap-8">
          {/* Language Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Transcription Language</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ta-IN">Tamil (India)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                <SelectItem value="te-IN">Telugu (India)</SelectItem>
                <SelectItem value="kn-IN">Kannada (India)</SelectItem>
                <SelectItem value="ml-IN">Malayalam (India)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audio Uploader */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <AudioUploader 
              onFileSelected={handleFileSelected} 
              isLoading={isProcessing}
            />
          </motion.div>

          {/* Transcription Result */}
          {transcriptionResult && selectedFile && (
            <TranscriptionResult 
              srtContent={transcriptionResult.srtContent}
              fileName={selectedFile.name}
              duration={transcriptionResult.duration}
              rawTranscriptData={transcriptionResult.rawTranscriptData}
            />
          )}
        </div>

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16 text-sm text-muted-foreground"
        >
          <p>
            Powered by AWS Transcribe technology for high-quality audio transcriptions
          </p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
