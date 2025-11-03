# 🤝 Contributing to Satoshe Sluggers

Thank you for your interest in contributing! This guide will help you get started.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm installed
- Git configured
- Basic understanding of TypeScript, React, and Next.js

### Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/satoshe-sluggers.git
   cd satoshe-sluggers
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Run development server**
   ```bash
   pnpm dev
   ```

5. **Verify setup**
   - Navigate to `http://localhost:3000`
   - Ensure the app loads without errors

---

## 📝 Development Workflow

### Branch Naming
- `feature/your-feature-name` - New features
- `fix/your-fix-name` - Bug fixes
- `docs/your-docs-update` - Documentation updates
- `refactor/your-refactor` - Code refactoring

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update tests if applicable

3. **Test your changes**
   ```bash
   pnpm build  # Ensure build passes
   pnpm lint   # Check for linting errors
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

---

## 💻 Code Style

### TypeScript
- Use TypeScript for all new code
- Define interfaces/types for props and data structures
- Avoid `any` - use proper types
- Use strict mode (already configured)

### React/Next.js
- Use functional components with hooks
- Prefer `"use client"` for client components
- Use Next.js Image component for images
- Implement proper error boundaries

### Styling
- Use Tailwind CSS utility classes
- Use design system tokens (see `lib/design-system.ts`)
- Use fluid typography classes (`.text-fluid-*`) instead of inline `clamp()`
- Use color utilities (`.text-brand-pink`, `.text-off-white`) instead of hardcoded colors
- Follow spacing scale: `gap-2`, `gap-4`, `gap-6`, etc.

### Example
```tsx
// ✅ Good
<h3 className="font-semibold text-off-white text-fluid-md">
  NFT Name
</h3>

// ❌ Bad
<h3 style={{ fontSize: 'clamp(0.9rem, 0.7vw, 1.1rem)' }} className="text-[#FFFBEB]">
  NFT Name
</h3>
```

---

## 📚 Documentation

### JSDoc Comments
Add JSDoc to all components, hooks, and utility functions:

```tsx
/**
 * NFTCard Component
 * 
 * Displays a single NFT card with image, details, and purchase options.
 * 
 * @example
 * ```tsx
 * <NFTCard name="NFT #1" image="/nfts/1.webp" ... />
 * ```
 * 
 * @param {NFTCardProps} props - Component props
 * @returns {JSX.Element} NFT card component
 */
export default function NFTCard({ ... }: NFTCardProps) {
  // ...
}
```

### Inline Comments
- Add comments for complex logic
- Explain "why" not "what" in comments
- Use comments to document non-obvious behavior

---

## 🧪 Testing

Currently, tests are being added incrementally. When adding new features:

1. Test manually in development
2. Verify build passes (`pnpm build`)
3. Check for linting errors (`pnpm lint`)
4. Test on different screen sizes (responsive design)

---

## 🔒 Security

### Never Commit
- API keys or secrets
- Private keys or wallet addresses
- `.env*` files
- Hardcoded credentials

### Security Practices
- All secrets must use environment variables
- Validate all user inputs
- Use parameterized queries for database operations
- Fail hard if required env vars are missing (no fallbacks)

---

## 🎨 Design System

### Colors
- **Brand Pink**: `#ff0099` → Use `.text-brand-pink` or `text-[#ff0099]`
- **Off-White**: `#FFFBEB` → Use `.text-off-white`
- **Semantic Colors**: Use Tailwind classes (`text-blue-400`, `text-green-400`)

### Typography
- Use fluid typography utilities: `.text-fluid-xs`, `.text-fluid-sm`, `.text-fluid-md`, `.text-fluid-lg`, `.text-fluid-xl`
- Never use inline `style={{ fontSize: 'clamp(...)' }}`

### Spacing
- Follow Tailwind spacing scale
- Use consistent gaps and padding

---

## 📦 Dependencies

### Adding Dependencies
- Use `pnpm add package-name`
- Prefer well-maintained packages
- Check bundle size impact
- Document why the dependency is needed

### Updating Dependencies
- Test thoroughly after updates
- Check for breaking changes
- Update related code if needed

---

## 🐛 Reporting Bugs

When reporting bugs, include:
1. **Description**: Clear explanation of the bug
2. **Steps to Reproduce**: Step-by-step instructions
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, OS, device
6. **Screenshots**: If applicable

---

## ✨ Feature Requests

When requesting features:
1. Explain the use case
2. Describe the desired behavior
3. Consider alternatives
4. Check if similar features exist

---

## 📋 Pull Request Checklist

Before submitting a PR:
- [ ] Code follows style guide
- [ ] Build passes (`pnpm build`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Documentation updated (if needed)
- [ ] No console statements in production code
- [ ] All hardcoded colors replaced with tokens
- [ ] All inline styles replaced with CSS classes
- [ ] JSDoc comments added (for new components/functions)
- [ ] Changes tested manually

---

## 🤔 Questions?

- Check existing documentation in `/docs`
- Review code comments
- Ask in discussions or issues

---

**Thank you for contributing!** 🎉

