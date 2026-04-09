import { UploadDropzone } from '@/lib/uploadthing';
import '@uploadthing/react/styles.css';
import { X, FileIcon } from 'lucide-react';
import Image from 'next/image';
interface FileUploadProps {
  endpoint: 'serverImage' | 'messageFile';
  value: string;
  fileName?: string;
  onChange: (url: string, fileName?: string) => void;
}

export const FileUpload = ({ endpoint, value, fileName, onChange }: FileUploadProps) => {
  const isImage =
    endpoint === 'serverImage' ||
    Boolean(fileName && /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(fileName));

  if (value) {
    return (
      <div className="flex w-full justify-center">
        {isImage ? (
          <div className="relative h-20 w-20">
            <Image fill src={value} alt="Upload" className="rounded-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -top-1 -right-1 z-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 hover:cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-4 bg-zinc-300/20 rounded">
            <FileIcon className="w-8 h-8 text-zinc-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{fileName}</p>
              <p className="text-xs text-zinc-400">File attached</p>
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              className="ml-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 hover:cursor-pointer flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <UploadDropzone
      endpoint={endpoint}
      onClientUploadComplete={(res) => {
        const fileName = res?.[0]?.name;
        onChange(res?.[0]?.ufsUrl || '', fileName);
      }}
      onUploadError={(error: Error) => console.error('Upload error:', error)}
    />
  );
};
