
import React, { useState, useRef } from 'react';
import { Cloud, FileAudio, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  disabled?: boolean; // Added the disabled prop as optional
  acceptedFileTypes?: string[];
  maxFileSizeMB?: number;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelected,
  isLoading,
  disabled = false, // Default to false
  acceptedFileTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/m4a'],
  maxFileSizeMB = 100
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!acceptedFileTypes.includes(file.type)) {
      toast.error(`Invalid file type. Please select ${acceptedFileTypes.join(', ')}`);
      return false;
    }

    // Check file size (convert MB to bytes)
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      toast.error(`File is too large. Maximum size is ${maxFileSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return; // Don't process drops if disabled
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelected(file);
      }
    }
  };

  const handleRemoveFile = () => {
    if (disabled) return; // Don't allow removing if disabled
    
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full"
    >
      {!selectedFile ? (
        <div
          onDragOver={disabled ? undefined : handleDragOver}
          onDragLeave={disabled ? undefined : handleDragLeave}
          onDrop={disabled ? undefined : handleDrop}
          onClick={disabled ? undefined : () => fileInputRef.current?.click()}
          className={cn(
            "glass-card rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 min-h-[250px]",
            isDragging ? "border-primary/50 bg-primary/5" : "hover:border-primary/30 hover:bg-background/80",
            disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={acceptedFileTypes.join(',')}
            className="hidden"
            disabled={disabled}
          />

          <motion.div
            animate={{ scale: isDragging ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Cloud className="w-16 h-16 text-primary/60" />
          </motion.div>

          <h3 className="font-medium text-xl mb-2">Upload an audio file</h3>
          <p className="text-muted-foreground text-center mb-4 max-w-sm">
            {disabled 
              ? "Please configure AWS credentials first" 
              : "Drag and drop your audio file here, or click to browse"}
          </p>
          
          <span className="text-xs text-muted-foreground">
            Supports {acceptedFileTypes.map(type => type.split('/')[1]).join(', ')} (up to {maxFileSizeMB}MB)
          </span>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-5 relative"
        >
          {isLoading ? (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
              <div className="flex flex-col items-center">
                <Loader2 className="animate-spin w-8 h-8 text-primary mb-3" />
                <span className="text-sm font-medium">Processing audio...</span>
                <div className="w-48 h-1 bg-muted rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-primary animate-progress rounded-full"></div>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleRemoveFile}
              className={cn(
                "absolute right-3 top-3 p-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
                disabled ? "cursor-not-allowed opacity-50" : ""
              )}
              aria-label="Remove file"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-primary/10 mr-4">
              <FileAudio className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AudioUploader;
