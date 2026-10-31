import { useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { PencilIcon } from 'lucide-react';
import { uploadProfilePhoto } from '@/firebase/drive/upload';

interface EditableAvatarProps {
    src?: string;
    alt?: string;
    fallback?: string;
    onUpload?: (url: string) => void;
}

export function EditableAvatar({ src, alt, fallback, onUpload }: EditableAvatarProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadProfilePhoto(file);
            onUpload?.(url);
        } catch (error) {
            console.error('Failed to upload:', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative h-full w-full">
            <Avatar className="h-full w-full hover:opacity-50" onClick={() => inputRef.current?.click()}>
                {src && <AvatarImage src={src} alt={alt} />}
                <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Edit icon — bottom left */}
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-2 right-2 flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
                {uploading ? <Spinner className="h-4 w-4" /> : <PencilIcon className="h-4 w-4" />}
            </button>
        </div>
    );
}