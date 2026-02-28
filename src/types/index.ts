export interface RecommendedTool {
  name: string;
  description: string;
  pricing: 'Free' | 'Freemium' | 'Paid';
  rating: string;
  link: string;
  trending: boolean;
  tags?: string[];
}
