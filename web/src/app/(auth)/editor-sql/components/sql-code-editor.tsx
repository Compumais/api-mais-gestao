"use client";

import { PostgreSQL, sql as sqlLang } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import * as React from "react";
import type { BiViewSchema } from "@/services/editor-sql.service";

interface SqlCodeEditorProps {
	value: string;
	onChange: (value: string) => void;
	onExecute?: () => void;
	views: BiViewSchema[];
	height?: string;
}

export function SqlCodeEditor({
	value,
	onChange,
	onExecute,
	views,
	height = "260px",
}: SqlCodeEditorProps) {
	const { resolvedTheme } = useTheme();

	const extensions = React.useMemo(() => {
		const schema: Record<string, string[]> = {};
		for (const v of views) {
			const cols = v.colunas.map((c) => c.nome);
			schema[v.nome] = cols;
			schema[`relatorios.${v.nome}`] = cols;
		}
		return [
			sqlLang({
				dialect: PostgreSQL,
				schema,
				upperCaseKeywords: true,
			}),
		];
	}, [views]);

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
				event.preventDefault();
				onExecute?.();
			}
		},
		[onExecute],
	);

	return (
		<div
			onKeyDown={handleKeyDown}
			className="overflow-hidden rounded-md border bg-background"
		>
			<CodeMirror
				value={value}
				height={height}
				theme={resolvedTheme === "dark" ? "dark" : "light"}
				extensions={extensions}
				onChange={onChange}
				basicSetup={{
					lineNumbers: true,
					highlightActiveLineGutter: true,
					foldGutter: true,
					autocompletion: true,
				}}
			/>
		</div>
	);
}
