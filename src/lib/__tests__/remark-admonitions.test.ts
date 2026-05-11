import { describe, it, expect } from "vitest";
import { preprocessAdmonitions } from "../remark-admonitions";

describe("preprocessAdmonitions", () => {
  describe("::: syntax (VitePress/Docusaurus)", () => {
    it("converts :::tip to Admonition", () => {
      const input = ":::tip\nThis is a tip\n:::";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="tip">');
      expect(result).toContain("This is a tip");
      expect(result).toContain("</Admonition>");
    });

    it("converts :::warning with title", () => {
      const input = ':::warning Important Notice\nBe careful here\n:::';
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="warning" title="Important Notice">');
      expect(result).toContain("Be careful here");
    });

    it("converts :::danger", () => {
      const input = ":::danger\nDo not do this\n:::";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="danger">');
    });

    it("converts :::info", () => {
      const input = ":::info\nFYI\n:::";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="info">');
    });

    it("converts :::note", () => {
      const input = ":::note\nA note\n:::";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="note">');
    });

    it("converts :::success", () => {
      const input = ":::success\nIt worked!\n:::";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="success">');
    });

    it("handles multi-line content", () => {
      const input = ":::tip\nLine 1\n\nLine 2\n\nLine 3\n:::";
      const result = preprocessAdmonitions(input);
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
      expect(result).toContain("Line 3");
    });

    it("handles code blocks inside admonitions", () => {
      const input = ":::tip\nTry this:\n```bash\nnpm install\n```\n:::";
      const result = preprocessAdmonitions(input);
      expect(result).toContain("npm install");
    });
  });

  describe("!!! syntax (MkDocs)", () => {
    it("converts !!! warning", () => {
      const input = '!!! warning "Important"\n    Be careful here';
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="warning" title="Important">');
      expect(result).toContain("Be careful here");
    });

    it("converts !!! note without title", () => {
      const input = "!!! note\n    This is a note";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="note">');
      expect(result).toContain("This is a note");
    });

    it("converts !!! tip with title", () => {
      const input = '!!! tip "Pro Tip"\n    Do this instead';
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="tip" title="Pro Tip">');
    });

    it("converts !!! info", () => {
      const input = '!!! info "First Iteration"\n    Work in progress';
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="info" title="First Iteration">');
    });

    it("converts !!! success", () => {
      const input = '!!! success "Hyvä Compatible"\n    Works with Hyvä';
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="success" title="Hyvä Compatible">');
    });

    it("handles multi-line indented content", () => {
      const input = '!!! warning "Watch out"\n    Line 1\n    Line 2\n    Line 3';
      const result = preprocessAdmonitions(input);
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
      expect(result).toContain("Line 3");
    });

    it("removes 4-space indent from content", () => {
      const input = "!!! note\n    Indented content";
      const result = preprocessAdmonitions(input);
      expect(result).not.toContain("    Indented content");
      expect(result).toContain("Indented content");
    });
  });

  describe("MkDocs type mapping", () => {
    it("maps abstract to info", () => {
      const input = "!!! abstract\n    Content";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="info">');
    });

    it("maps bug to danger", () => {
      const input = "!!! bug\n    Content";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="danger">');
    });

    it("maps caution to warning", () => {
      const input = ":::caution\nContent\n:::";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="warning">');
    });

    it("maps Important to warning (case insensitive)", () => {
      const input = "!!! Important\n    Content";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="warning">');
    });

    it("maps unknown types to note", () => {
      const input = ":::unknown\nContent\n:::";
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Admonition type="note">');
    });
  });

  describe("??? syntax (MkDocs collapsible)", () => {
    it("converts ??? to Collapsible with Admonition", () => {
      const input = '??? note "Click to expand"\n    Hidden content';
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Collapsible title="Click to expand">');
      expect(result).toContain('<Admonition type="note">');
      expect(result).toContain("Hidden content");
    });

    it("converts ???+ (open by default)", () => {
      const input = '???+ tip "Open section"\n    Visible content';
      const result = preprocessAdmonitions(input);
      expect(result).toContain('<Collapsible title="Open section">');
      expect(result).toContain('<Admonition type="tip">');
    });
  });

  describe("preserves existing content", () => {
    it("does not modify <Admonition> JSX", () => {
      const input = '<Admonition type="tip" title="Hello">\nContent\n</Admonition>';
      const result = preprocessAdmonitions(input);
      expect(result).toBe(input);
    });

    it("does not modify regular markdown", () => {
      const input = "# Hello\n\nThis is regular content.\n\n- List item";
      const result = preprocessAdmonitions(input);
      expect(result).toBe(input);
    });

    it("handles mixed content (admonitions + regular)", () => {
      const input = "# Title\n\nSome text\n\n:::tip\nA tip\n:::\n\nMore text";
      const result = preprocessAdmonitions(input);
      expect(result).toContain("# Title");
      expect(result).toContain("Some text");
      expect(result).toContain('<Admonition type="tip">');
      expect(result).toContain("More text");
    });
  });
});
