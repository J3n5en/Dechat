import { printImage } from "../deps.ts";

export const displayImgToConsole = (imgBase64: string) => {
  printImage({
    rawFile: Uint8Array.from(
      atob(imgBase64.replace(/^data:.*;base64./ig, "")),
      (c) => c.charCodeAt(0),
    ),
  });
};

export function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
