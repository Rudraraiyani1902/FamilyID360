import api from './axios';

export const sendAssistantMessage = (message) =>
  api.post('/assistant/chat', { message });

export default { sendAssistantMessage };
