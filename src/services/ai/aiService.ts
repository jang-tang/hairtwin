import type { AiImageService, FeedbackInput, ImageEditInput, StyleGenerationInput } from './types';
import { editStyle, generateCandidates, interpretFeedback } from '../apiClient';

class OpenAiBackendService implements AiImageService {
  async generateStyleCandidates(input: StyleGenerationInput) {
    if (!input.hairPhotos.front || !input.hairPhotos.side || !input.hairPhotos.back) {
      throw new Error('정면·옆·뒤 사진을 모두 업로드해주세요.');
    }
    return (await generateCandidates(input)).candidates;
  }

  async interpretFeedback(input: FeedbackInput) {
    return interpretFeedback(input);
  }

  async editStyleImage(input: ImageEditInput) {
    return editStyle(input);
  }
}

export const aiService: AiImageService = new OpenAiBackendService();
