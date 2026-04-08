'use client';

import qs from 'query-string';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect } from 'react';
import { ChannelForm, channelFormSchema } from '@/lib/schemas';
import { useModal } from '@/hooks/use-modal.store';
import { ChannelType } from '@/generated/prisma/enums';
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field';

export const EditChannelModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === 'editChannel';
  const { channel, server } = data;

  const form = useForm<ChannelForm>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      name: '',
      type: channel?.type || ChannelType.TEXT,
    },
  });

  useEffect(() => {
    if (isModalOpen && channel) {
      form.reset({
        name: channel.name ?? '',
        type: channel.type ?? ChannelType.TEXT,
      });
    }
  }, [isModalOpen, channel, form]);

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: ChannelForm) => {
    try {
      const url = qs.stringifyUrl({
        url: `/api/channels/${channel?.id}`,
        query: {
          serverId: server?.id,
        },
      });
      await axios.patch(url, values);

      form.reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.log(error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#242429] text-white p-4 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">Edit Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FieldGroup>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Channel name</FieldLabel>

                  <Input
                    id="form-channel-name"
                    disabled={isLoading}
                    placeholder="Enter channel name"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="type"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Channel Type</FieldLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="bg-zinc-300/50 border-0 focus:ring-0  ring-offset-0 focus:ring-offset-0 capitalize outline-none">
                      <SelectValue placeholder="Select a channel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ChannelType).map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="bg-[#242429]">
            <Button disabled={isLoading} className="w-full" variant="blue">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
