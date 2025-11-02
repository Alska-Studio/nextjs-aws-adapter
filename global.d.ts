declare const awslambda: {
  streamifyResponse<TEvent = any>(handler: (event: TEvent, responseStream: NodeJS.WritableStream, context: any) => Promise<void>): (event: TEvent, context: any) => Promise<any>;
};
