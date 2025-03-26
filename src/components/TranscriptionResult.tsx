import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Download, Copy, Clock, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface TranscriptionResultProps {
  srtContent: string;
  fileName: string;
  duration: string;
  rawTranscriptData?: any;
}

const TranscriptionResult: React.FC<TranscriptionResultProps> = ({
  srtContent,
  fileName,
  duration,
  rawTranscriptData
}) => {
  const [copied, setCopied] = useState(false);

  const downloadSrt = () => {
    try {
      const blob = new Blob([srtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.split('.')[0]}.srt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('SRT file downloaded successfully');
    } catch (error) {
      console.error('Error downloading SRT file:', error);
      toast.error('Failed to download SRT file');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(srtContent)
      .then(() => {
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        toast.error('Failed to copy to clipboard');
      });
  };

  const downloadJson = () => {
    if (!rawTranscriptData) {
      toast.error('Raw transcript data is not available');
      return;
    }

    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(rawTranscriptData, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${fileName.replace(/\.[^/.]+$/, '')}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('JSON file downloaded successfully');
  };

  // Extract the first few lines to preview
  const previewLines = srtContent.split('\n').slice(0, 15).join('\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full"
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transcription Result</span>
            <div className="flex items-center text-sm font-normal text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>Duration: {duration}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto rounded-md bg-muted p-4 font-mono text-sm">
            {srtContent.split('\n').map((line, index) => (
              <div key={index} className={index % 4 === 1 ? 'text-muted-foreground' : ''}>
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {srtContent.split('\n\n').length - 1} subtitles generated
          </div>
          <div className="flex gap-2">
            {rawTranscriptData && (
              <Button variant="outline" size="sm" onClick={downloadJson}>
                <FileJson className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
            )}
            <Button variant="default" size="sm" onClick={downloadSrt}>
              <Download className="mr-2 h-4 w-4" />
              Download SRT
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default TranscriptionResult;
