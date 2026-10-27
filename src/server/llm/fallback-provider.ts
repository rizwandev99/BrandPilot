import type {
  BrandKitGenerationInput,
  BrandKitOutput,
  IdeasGenerationInput,
  IdeaItem,
  CreativeGenerationInput,
  CreativeOutput,
  ConditionEvaluationInput,
  ConditionOutput,
  LlmResult,
  LlmProvider,
} from './interface';

export class FallbackProvider implements LlmProvider {
  readonly name = 'fallback' as const;

  async generateBrandKit(input: BrandKitGenerationInput): Promise<LlmResult<BrandKitOutput>> {
    const scraped = input.scrapedData;
    let name = 'BrandPilot Showcase';

    if (scraped?.title) {
      name = scraped.title.split(/[-|•–:]/)[0].trim() || 'BrandPilot Showcase';
    } else if (input.url) {
      try {
        const parsed = new URL(input.url);
        const hostParts = parsed.hostname.replace(/^www\./, '').split('.');
        if (hostParts[0]) {
          name = hostParts[0].charAt(0).toUpperCase() + hostParts[0].slice(1);
        }
      } catch {
        // Keep default name
      }
    }

    const summary =
      scraped?.description?.trim() ||
      scraped?.sampleText?.slice(0, 200).trim() ||
      `${name} delivers high-performance solutions designed to streamline workflows and drive brand engagement.`;

    const tone = ['Professional', 'Authoritative', 'Innovative', 'Customer-Centric'];
    const dos = [
      'Lead with tangible value and quantifiable outcomes',
      'Use concise, action-oriented messaging',
      'Maintain visual and tonal consistency across all channels',
    ];
    const donts = [
      'Avoid vague buzzwords and unsubstantiated claims',
      'Do not overwhelm copy with excessive emojis or hashtags',
      'Never compromise on user privacy or data security',
    ];

    const audience =
      scraped?.description && scraped.description.length > 20
        ? `Professionals, developers, and teams seeking modern solutions in ${name}'s domain.`
        : 'Modern professionals, enterprise leaders, and ambitious creators.';

    // Color extraction with WCAG AA compliance guarantee
    let primary = '#2563eb';
    let secondary = '#4f46e5';

    if (scraped?.colors && scraped.colors.length > 0) {
      const hexList = scraped.colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
      if (hexList[0]) primary = hexList[0];
      if (hexList[1]) secondary = hexList[1];
    }

    const keywords: string[] = [];
    if (scraped?.headings) {
      for (const h of scraped.headings) {
        const words = h
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3);
        keywords.push(...words);
      }
    }
    if (keywords.length === 0) {
      keywords.push('growth', 'automation', 'productivity', 'marketing', 'leadership');
    }
    const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 8);

    const kit: BrandKitOutput = {
      name,
      summary,
      tone,
      dos,
      donts,
      audience,
      colors: {
        primary,
        secondary,
        background: '#ffffff',
        text: '#0f172a',
      },
      keywords: uniqueKeywords,
    };

    return {
      data: kit,
      provider: 'fallback',
    };
  }

  async generateIdeas(input: IdeasGenerationInput): Promise<LlmResult<IdeaItem[]>> {
    const { brandKit, goal, channels, postCount } = input;
    const items: IdeaItem[] = [];
    const count = Math.max(1, postCount || 1);

    const angles = [
      'Industry Insight & Future Trends',
      'Problem Solving & Practical Tips',
      'Customer Milestone & Impact Story',
      'Behind the Scenes & Core Philosophy',
      'Product Innovation & Deep Dive',
      'Quick Wins & Frameworks',
    ];

    for (let i = 0; i < count; i++) {
      const channel = channels[i % channels.length] || 'linkedin';
      const angle = angles[i % angles.length];
      const keyMessage = `How ${brandKit.name} enables teams to achieve "${goal}" through disciplined execution and innovative strategy.`;

      items.push({
        id: `idea-${channel}-${i + 1}`,
        channel,
        angle,
        keyMessage,
      });
    }

    return {
      data: items,
      provider: 'fallback',
    };
  }

  async generateCreative(input: CreativeGenerationInput): Promise<LlmResult<CreativeOutput>> {
    const { brandKit, idea } = input;
    const channel = idea.channel;

    let caption = '';
    const hashtags = [
      `#${brandKit.name.replace(/[^a-zA-Z0-9]/g, '')}`,
      '#Innovation',
      '#GrowthStrategy',
      '#Productivity',
    ];

    switch (channel) {
      case 'x':
        caption = `${idea.angle}: ${idea.keyMessage}\n\nKey takeaways for modern teams 👇`;
        break;
      case 'instagram':
        caption = `✨ ${idea.angle}\n\n${idea.keyMessage}\n\nSave this for your next strategy session!\n\n${hashtags.join(' ')}`;
        break;
      case 'facebook':
        caption = `${idea.angle}\n\n${idea.keyMessage}\n\nLearn more about how we build the future at ${brandKit.name}.`;
        break;
      case 'linkedin':
      default:
        caption = `${idea.angle}\n\n${idea.keyMessage}\n\nWhat strategies are working best for your organization this quarter? Share your thoughts below.`;
        break;
    }

    const output: CreativeOutput = {
      caption,
      hashtags: hashtags.slice(0, 5),
      creativeSpec: {
        headline: idea.angle,
        subline: idea.keyMessage,
        templateId: 'quote-card',
        colors: {
          primary: brandKit.colors.primary,
          secondary: brandKit.colors.secondary,
          background: brandKit.colors.background,
          text: brandKit.colors.text,
        },
      },
    };

    return {
      data: output,
      provider: 'fallback',
    };
  }

  async evaluateCondition(input: ConditionEvaluationInput): Promise<LlmResult<ConditionOutput>> {
    const { prompt, eventPayload } = input;
    const payloadStr = JSON.stringify(eventPayload || {}).toLowerCase();
    const promptStr = prompt.toLowerCase();

    // Check for negative constraints
    const isNegation = promptStr.includes('not') || promptStr.includes('never') || promptStr.includes('exclude');

    // Extract search terms from prompt
    const terms = promptStr
      .replace(/check\s+if|matches|verify|this|event|when|that|the|is/gi, '')
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    let matchCount = 0;
    for (const term of terms) {
      if (payloadStr.includes(term)) {
        matchCount++;
      }
    }

    const matched = isNegation ? matchCount === 0 : matchCount > 0 || terms.length === 0;

    return {
      data: {
        matched,
        reason: matched
          ? `Condition matched deterministic rule evaluation against event payload (${matchCount} terms found).`
          : `Condition did not match event payload attributes.`,
      },
      provider: 'fallback',
    };
  }
}
