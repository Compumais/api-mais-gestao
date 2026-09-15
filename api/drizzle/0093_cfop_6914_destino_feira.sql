UPDATE "cfop"
SET "interestadualdestmesmauf" = 1
WHERE regexp_replace(COALESCE("codigo", ''), '[^0-9]', '', 'g') = '6914'
	AND COALESCE("interestadualdestmesmauf", 0) <> 1;
