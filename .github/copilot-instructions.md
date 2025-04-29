<react-codebase-guidelines>
  <title>React Engineering Playbook (with Examples)</title>
  <purpose>
    Ensure high-quality, maintainable, scalable frontends using React, enforced by patterns, examples, and rules.
  </purpose>

  <section name="Component Structure">
    <principle name="Component Naming">
      <description>Use PascalCase for components. Avoid lowercase or mixed casing.</description>
      <example language="typescript">
        // Good
        const UserProfile = () => { return <div>User</div> };

        // Bad
        const userprofile = () => { return <div>User</div> };
      </example>
    </principle>

    <principle name="Folder Co-location">
      <description>Each component should live in its own folder with test and style files.</description>
      <example language="plaintext">
        Good:
        /UserCard
          ├── index.tsx
          ├── UserCard.test.tsx
          └── UserCard.module.css

        Bad:
        /components
          ├── index.tsx
          ├── index.test.tsx
          └── index.css
      </example>
    </principle>
  </section>

  <section name="Styling">
    <principle name="Tailwind + clsx">
      <description>Use Tailwind utility classes and `clsx` for dynamic styling.</description>
      <example language="tsx">
        // Good
        <div className={clsx("p-4", isActive && "bg-blue-500")} />

        // Bad
        <div className={isActive ? "p-4 bg-blue-500" : "p-4"} />
      </example>
    </principle>
  </section>

  <section name="Folder Structure">
    <principle name="Feature-Based Domains">
      <description>Group by domain, not file type.</description>
      <example language="plaintext">
        Good:
        /features/chat/components/ChatBubble.tsx

        Bad:
        /components/Chat/ChatBubble.tsx
      </example>
    </principle>
  </section>

  <section name="Hooks">
    <principle name="Encapsulation">
      <description>Encapsulate logic into hooks, don't embed side effects in components.</description>
      <example language="tsx">
        // Good
        const { data } = useUserData();

        // Bad
        useEffect(() => {
          axios.get("/user").then(setUser);
        }, []);
      </example>
    </principle>
  </section>

  <section name="State Management">
    <principle name="Redux or Zustand">
      <description>Use Zustand for global UI state; Redux Toolkit for enterprise logic.</description>
      <example language="ts">
        // Good
        const useStore = create(set => ({
          darkMode: false,
          toggle: () => set(state => ({ darkMode: !state.darkMode }))
        }));

        // Bad
        const [darkMode, setDarkMode] = useState(false);
      </example>
    </principle>
  </section>

  <section name="API Layer">
    <principle name="Service Encapsulation">
      <description>Abstract all HTTP calls inside services. No raw `fetch/axios` in components.</description>
      <example language="ts">
        // Good
        const data = await UserService.getProfile();

        // Bad
        const data = await axios.get("/api/user");
      </example>
    </principle>
  </section>

  <section name="Performance">
    <principle name="Memoization">
      <description>Use `useMemo`, `useCallback`, and `React.memo` to optimize expensive renders.</description>
      <example language="tsx">
        // Good
        const sorted = useMemo(() => items.sort(), [items]);

        // Bad
        const sorted = items.sort();
      </example>
    </principle>
  </section>

  <section name="Accessibility (a11y)">
    <principle name="Keyboard & ARIA">
      <description>Ensure all controls are focusable and labelled for screen readers.</description>
      <example language="tsx">
        // Good
        <button aria-label="Close" onClick={handleClose}>×</button>

        // Bad
        <div onClick={handleClose}>×</div>
      </example>
    </principle>
  </section>

  <section name="i18n">
    <principle name="No Hardcoded Strings">
      <description>Always wrap strings in translation functions (`t`).</description>
      <example language="tsx">
        // Good
        <h1>{t("welcome.message")}</h1>

        // Bad
        <h1>Welcome to the platform</h1>
      </example>
    </principle>
  </section>

  <section name="Testing">
    <principle name="Clear Test Types">
      <description>Test UI interactions and logic, not implementation details.</description>
      <example language="tsx">
        // Good
        test('shows error on invalid email', () => { ... });

        // Bad
        test('calls setState with false', () => { ... });
      </example>
    </principle>
  </section>

  <section name="CI/CD & Quality Gates">
    <principle name="Strict Enforcement">
      <description>Block merges unless tests, lint, typecheck, and prettier pass.</description>
      <example language="json">
        // .husky/pre-push
        "scripts": {
          "check": "tsc && eslint . && prettier --check . && vitest run"
        }
      </example>
    </principle>
  </section>

  <section name="Error Boundaries">
    <principle name="Global + Scoped">
      <description>Use a global app error boundary and scoped ones for risky components.</description>
      <example language="tsx">
        // Good
        <ErrorBoundary>
          <HeavyWidget />
        </ErrorBoundary>

        // Bad
        <HeavyWidget />
      </example>
    </principle>
  </section>
</react-codebase-guidelines>
