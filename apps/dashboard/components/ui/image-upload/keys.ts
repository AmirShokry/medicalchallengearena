import type { Image } from ".";

export const imagesKey = createInjection<Ref<Image[]>>("imagesKey");
export const isDraggingKey = createInjection<Ref<boolean>>("isDraggingKey");
export const maxSizeKBKey = createInjection<Ref<number>>("maxSizeKBKey");
export const ratioTextKey = createInjection<Ref<string>>("ratioTextKey");
export const apiKey = createInjection<Ref<string>>("imageApiKey");
