import { UploadDropzone } from '@/utils/uploadthing';
import '@uploadthing/react/styles.css';
import { X } from 'lucide-react';
import Image from 'next/image';
interface FileUploadProps {
  endpoint: 'serverImage' | 'messageFile';
  value: string;
  onChange: (url: string) => void;
}

export const FileUpload = ({ endpoint, value, onChange }: FileUploadProps) => {
  if (value) {
    return (
      <div className="relative  h-20 max-w-20">
        <Image fill src={value} alt="Upload" className="rounded-full" />
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 hover:cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <UploadDropzone
      endpoint={endpoint}
      onClientUploadComplete={(res) => onChange(res?.[0]?.ufsUrl)}
      onUploadError={(error: Error) => console.error('Upload error:', error)}
    />
  );
};
