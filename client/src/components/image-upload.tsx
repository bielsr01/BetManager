import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileImage, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  onImageRemove?: () => void;
  isProcessing?: boolean;
  uploadedImage?: string | null;
  className?: string;
}

export function ImageUpload({
  onImageUpload,
  onImageRemove,
  isProcessing = false,
  uploadedImage = null,
  className,
}: ImageUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith("image/")) {
      onImageUpload(file);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  // Handle paste events
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          onImageUpload(file);
        }
        break;
      }
    }
  }, [onImageUpload]);

  if (uploadedImage) {
    return (
      <Card className={cn("relative", className)}>
        <CardContent className="p-4">
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded screenshot"
              className="w-full max-h-96 object-contain rounded-lg border"
              data-testid="img-uploaded"
            />
            
            {onImageRemove && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={onImageRemove}
                data-testid="button-remove-image"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm text-muted-foreground">Processando OCR...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed cursor-pointer transition-colors hover-elevate",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        isProcessing && "pointer-events-none opacity-50",
        className
      )}
      onPaste={handlePaste}
      tabIndex={0}
      data-testid="dropzone-upload"
    >
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted">
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isProcessing ? "Processando..." : "Faça upload da imagem"}
            </h3>
            
            <div className="text-muted-foreground space-y-1">
              <p>Arraste e solte uma imagem aqui</p>
              <p className="text-sm">ou <span className="text-primary font-medium">clique para selecionar</span></p>
              <p className="text-sm">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+V</kbd> para colar da área de transferência
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileImage className="h-4 w-4" />
            <span>PNG, JPG, JPEG, GIF, BMP, WEBP</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}