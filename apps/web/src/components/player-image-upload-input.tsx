import { FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface PlayerImageUploadInputProps {
  disabled?: boolean;
  imageUrl: string;
  inputId: string;
  isUploading: boolean;
  onSelectFile: (file: File) => Promise<void>;
  uploadedImageName: string;
}

export const PlayerImageUploadInput = ({
  disabled,
  imageUrl,
  inputId,
  isUploading,
  onSelectFile,
  uploadedImageName,
}: PlayerImageUploadInputProps) => {
  const hasImage = imageUrl.trim().length > 0;

  return (
    <>
      <FieldLabel htmlFor={inputId}>Profile image</FieldLabel>
      <Input
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || isUploading}
        id={inputId}
        onChange={async (event) => {
          const selectedFile = event.target.files?.[0];
          if (!selectedFile) {
            return;
          }

          await onSelectFile(selectedFile);
          event.target.value = "";
        }}
        type="file"
      />
      <FieldDescription>
        Optional. JPEG, PNG, or WebP up to 5MB.
      </FieldDescription>
      {isUploading ? <p className="text-xs">Uploading image...</p> : null}
      {uploadedImageName.length > 0 && hasImage ? (
        <p className="text-muted-foreground text-xs">
          Uploaded: {uploadedImageName}
        </p>
      ) : null}
      {hasImage ? (
        <div className="mt-1 flex items-center gap-3 rounded-md border bg-background p-2">
          <img
            alt="Player profile preview"
            className="size-12 rounded-md object-cover"
            height={48}
            src={imageUrl}
            width={48}
          />
          <p className="text-muted-foreground text-xs">
            {uploadedImageName.length > 0
              ? "Previewing uploaded image."
              : "Current image preview."}
          </p>
        </div>
      ) : null}
    </>
  );
};
