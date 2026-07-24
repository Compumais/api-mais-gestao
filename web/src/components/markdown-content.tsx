"use client";

import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const markdownSanitizeSchema = {
	...defaultSchema,
	tagNames: [...(defaultSchema.tagNames ?? []), "u"],
	protocols: {
		...defaultSchema.protocols,
		src: [...(defaultSchema.protocols?.src ?? []), "data"],
	},
};

function urlTransformMarkdown(url: string) {
	if (url.startsWith("data:image/")) {
		return url;
	}
	return defaultUrlTransform(url);
}

type MarkdownContentProps = {
	content: string;
	className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
	return (
		<div className={className}>
			<ReactMarkdown
				urlTransform={urlTransformMarkdown}
				rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
