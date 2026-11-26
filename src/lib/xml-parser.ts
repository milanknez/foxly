// Generický XML Feed parser (Heureka, Zboží.cz, Shoptet, Dodavatelské XML feedy)
export function parseXmlFeed(xmlText: string) {
  const candidateTags = ["SHOPITEM", "ITEM", "PRODUCT", "POLOZKA", "ENTRY", "ROW", "RECORD"];
  let chosenTag = "";

  for (const tag of candidateTags) {
    const reg = new RegExp(`<${tag}[^>]*>`, "i");
    if (reg.test(xmlText)) {
      chosenTag = tag;
      break;
    }
  }

  if (!chosenTag) {
    const allTagsMatch = xmlText.match(/<([a-zA-Z0-9_-]+)[\s>]/g);
    if (allTagsMatch) {
      const counts: Record<string, number> = {};
      for (const m of allTagsMatch) {
        const t = m.replace(/[<>]/g, "").trim().split(/\s+/)[0];
        if (!["SHOP", "FEED", "ROOT", "XML", "CHANNEL", "?XML"].includes(t.toUpperCase())) {
          counts[t] = (counts[t] || 0) + 1;
        }
      }
      for (const [t, c] of Object.entries(counts)) {
        if (c >= 2) {
          chosenTag = t;
          break;
        }
      }
    }
  }

  if (!chosenTag) chosenTag = "SHOPITEM";

  const items: any[] = [];
  const itemRegex = new RegExp(`<${chosenTag}[^>]*>([\\s\\S]*?)<\\/${chosenTag}>`, "gi");
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null && items.length < 50) {
    const itemXml = match[1];
    const rowObj: Record<string, any> = {};

    const tagRegex = /<([a-zA-Z0-9_-]+)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/gi;
    let tagMatch;

    while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
      const tagName = tagMatch[1];
      let val: string | number = tagMatch[2].trim();

      if (val.includes("<")) {
        val = val.replace(/<[^>]+>/g, "").trim();
      }

      const upTag = tagName.toUpperCase();
      if (upTag.includes("PRICE") || upTag.includes("CENA") || upTag.includes("AMOUNT")) {
        const num = Number(String(val).replace(/\s+/g, "").replace(",", "."));
        if (!isNaN(num)) val = num;
      }

      rowObj[tagName] = val;
    }

    if (Object.keys(rowObj).length > 0) {
      items.push(rowObj);
    }
  }

  return items;
}
