import { renderToString } from 'react-dom/server';
import App from './App';

export function render(serverData: any) {
  const html = renderToString(<App serverData={serverData} />);
  return html;
}

export { render as default };
