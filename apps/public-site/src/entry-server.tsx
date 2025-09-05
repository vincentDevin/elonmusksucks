import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

export function render(data: any) {
  const html = renderToString(<App {...data} />);
  return { html, data };
}
