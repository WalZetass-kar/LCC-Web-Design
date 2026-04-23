# Contributing to MediaSoft POS WalDevelop

Terima kasih atas minat Anda untuk berkontribusi pada MediaSoft POS WalDevelop! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm v9+
- Git
- Code editor (VS Code recommended)

### Setup Development Environment

1. **Fork & Clone**
```bash
git clone https://github.com/your-username/mediasoft-pos-waldevelop.git
cd mediasoft-pos-waldevelop
```

2. **Install Dependencies**
```bash
npm install
```

3. **Setup Database**
```bash
node backend/database/migrate.js
```

4. **Run Development**
```bash
npm run dev
```

## 💻 Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent fixes

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes
2. Test thoroughly
3. Commit with meaningful messages
4. Push to your fork
5. Create Pull Request

## 📝 Coding Standards

### JavaScript/React

#### Naming Conventions

```javascript
// Components: PascalCase
const ProductCard = () => {};

// Functions: camelCase
const calculateTotal = () => {};

// Constants: UPPER_SNAKE_CASE
const MAX_ITEMS = 100;

// Files: PascalCase for components, camelCase for utilities
ProductCard.jsx
utils.js
```

#### Component Structure

```javascript
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Component definition
const MyComponent = ({ prop1, prop2 }) => {
  // Hooks
  const [state, setState] = useState(null);
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

// PropTypes (optional but recommended)
MyComponent.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number
};

export default MyComponent;
```

#### Controller Structure (Backend)

```javascript
import DatabaseConnection from '../database/connection.js';
import { tableName } from '../models/schema.js';

class MyController {
  /**
   * Method description
   * @param {type} paramName - Parameter description
   * @returns {Promise<Object>}
   */
  static async methodName(paramName) {
    try {
      const db = DatabaseConnection.getInstance();
      
      // Logic here
      
      return {
        success: true,
        message: 'Success message',
        data: result
      };
    } catch (error) {
      console.error('Error:', error);
      return {
        success: false,
        message: 'Error message'
      };
    }
  }
}

export default MyController;
```

### CSS/Tailwind

```jsx
// Use Tailwind utility classes
<div className="flex items-center gap-4 p-6 glass rounded-xl">
  <Button variant="primary" size="md">
    Click Me
  </Button>
</div>

// Custom classes in index.css for reusable styles
.glass {
  @apply bg-white/10 backdrop-blur-md border border-white/20;
}
```

### File Organization

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Button.jsx
│   │   └── Input.jsx
│   └── layout/          # Layout components
│       └── Sidebar.jsx
├── pages/               # Page components
│   └── DashboardPage.jsx
├── context/             # React Context
│   └── AuthContext.jsx
└── utils/               # Utility functions
    └── helpers.js
```

## 📦 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(transaction): add discount functionality"

# Bug fix
git commit -m "fix(products): resolve stock calculation error"

# Documentation
git commit -m "docs(readme): update installation steps"

# Refactor
git commit -m "refactor(controllers): optimize database queries"
```

## 🔄 Pull Request Process

### Before Submitting

1. ✅ Code follows style guidelines
2. ✅ All tests pass
3. ✅ No console errors
4. ✅ Documentation updated
5. ✅ Commit messages are clear

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test the changes

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. Submit PR to `develop` branch
2. Wait for code review
3. Address feedback
4. Get approval
5. Merge

## 🏗️ Project Structure

### Backend

```
backend/
├── controllers/        # Business logic (OOP)
│   ├── AuthController.js
│   ├── ProductController.js
│   └── TransactionController.js
├── models/            # Database schema
│   └── schema.js
└── database/          # DB utilities
    ├── connection.js
    ├── migrate.js
    └── seed.js
```

### Frontend

```
src/
├── components/        # Reusable components
├── pages/            # Application pages
├── context/          # State management
├── App.jsx           # Main component
└── main.jsx          # Entry point
```

### Electron

```
main/
├── ipc/              # IPC handlers
├── main.js           # Main process
└── preload.js        # Context bridge
```

## 🧪 Testing

### Manual Testing

1. Test all CRUD operations
2. Test transaction flow
3. Test authentication
4. Test theme switching
5. Test responsive design

### Automated Testing (Future)

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## 📚 Resources

### Documentation

- [React Docs](https://react.dev)
- [Electron Docs](https://www.electronjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs)
- [TanStack Table](https://tanstack.com/table)

### Tools

- [VS Code](https://code.visualstudio.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [SQLite Browser](https://sqlitebrowser.org/)

## 💡 Tips

### Performance

- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Avoid unnecessary re-renders
- Optimize database queries

### Security

- Validate all inputs
- Use parameterized queries (ORM)
- Don't expose sensitive data
- Follow Electron security guidelines

### Code Quality

- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Follow DRY principle

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment**
- OS: [e.g. Windows 10]
- Node version: [e.g. 18.0.0]
- App version: [e.g. 1.0.0]

**Additional context**
Any other information
```

## 💬 Questions?

- Open an issue for questions
- Check existing issues first
- Be specific and provide context

## 🎉 Recognition

Contributors will be recognized in:
- README.md
- CHANGELOG.md
- Release notes

Thank you for contributing! 🚀

---

**MediaSoft POS WalDevelop**
Built with ❤️ by the community
