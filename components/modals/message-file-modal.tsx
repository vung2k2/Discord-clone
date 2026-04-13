'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import qs from 'query-string';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { FileUpload } from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useModal } from '@/hooks/use-modal.store';
import { Field, FieldGroup } from '../ui/field';

const formSchema = z.object({
  fileUrl: z.string().min(1, { message: 'Attachment is required.' }),
  fileName: z.string().optional(),
});

export function MessageFileModal() {
  const {
    isOpen,
    onClose,
    type,
    data: { apiUrl, query },
  } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === 'messageFile';

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fileUrl: '',
      fileName: '',
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: apiUrl || '',
        query,
      });
      await axios.post(url, {
        fileUrl: values.fileUrl,
        fileName: values.fileName,
        content: values.fileUrl,
      });

      form.reset();
      router.refresh();
      handleClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an attachment</DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Send a file as a message.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FieldGroup>
            <div className="space-y-8 px-6">
              <div className="flex items-center justify-center text-center">
                <Controller
                  control={form.control}
                  name="fileUrl"
                  render={({ field: fileUrlField }) => (
                    <Controller
                      control={form.control}
                      name="fileName"
                      render={({ field: fileNameField }) => (
                        <Field>
                          <FileUpload
                            endpoint="messageFile"
                            value={fileUrlField.value}
                            fileName={fileNameField.value}
                            onChange={(url, fileName) => {
                              fileUrlField.onChange(url);
                              fileNameField.onChange(fileName || '');
                            }}
                          />
                        </Field>
                      )}
                    />
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isLoading} className="w-full" variant="blue">
                Send
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
