# AI Instructions

This file replaces an old starter-template document that did not describe the schema workspace.

For schema-driven work, read these first:
- `../AGENTS.md`
- `ai/README.md`
- `ai/architecture.md`
- `ai/runtime/authority-routing.md`
- `ai/runtime/typesense.md`

Then resolve the concrete source files for the task:
- generator/source-of-truth work: `../config/graph.mpdg`, `../config/app.config.yaml`, `../src/lib/**`
- runtime template work: `../module/src/resources/**`
- model-specific controller/runtime work: `../module/docs/controllers/<model>.md`

Key rules:
- Keep schema canon abstract and reusable.
- Normalize `tenant`, `remote`, and `instance` into `instance authority` when reasoning about routing.
- Treat generated manifests and runtime templates as the factual source of behavior.

## 🎯 Success Criteria

An AI assistant should be considered successful when:
1. **Code runs without errors** in development mode
2. **TypeScript compiles** without type errors
3. **Linting passes** or only has acceptable warnings
4. **Code follows** existing patterns and style
5. **Functionality works** as requested by the user
6. **Dependencies are properly managed** and documented

## 📝 Communication Tips

When working with users:
- Explain what commands you're running and why
- Show progress with clear status updates
- Mention when you're installing new dependencies
- Explain any architectural decisions you make
- Provide clear instructions for testing the implementation
- Offer suggestions for extending or improving the code

---

*These instructions ensure consistent, high-quality assistance when working with this Node.js TypeScript template. Follow them to provide the best possible development experience.*
