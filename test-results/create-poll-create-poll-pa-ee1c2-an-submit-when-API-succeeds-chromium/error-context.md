# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - link "← Back" [ref=e4] [cursor=pointer]:
      - /url: /
    - heading "Create Poll" [level=1] [ref=e5]
    - paragraph [ref=e6]: "Step 1: Basics"
    - paragraph [ref=e7]: Open this app inside Alien to create a poll.
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Title
        - textbox "Title" [active] [ref=e11]:
          - /placeholder: Poll title
          - text: E2E Poll
      - generic [ref=e12]:
        - generic [ref=e13]: Description (optional)
        - textbox "Description (optional)" [ref=e14]:
          - /placeholder: Describe what this poll is about...
      - generic [ref=e15]:
        - generic [ref=e16]: Poll type
        - generic [ref=e17]:
          - generic [ref=e18]:
            - radio "Standard" [checked] [ref=e19]
            - text: Standard
          - generic [ref=e20]:
            - radio "Capital (winner gets ALIEN)" [ref=e21]
            - text: Capital (winner gets ALIEN)
    - generic [ref=e22]:
      - link "Cancel" [ref=e23] [cursor=pointer]:
        - /url: /
      - button "Next" [ref=e24]
  - button "Open Next.js Dev Tools" [ref=e30] [cursor=pointer]:
    - img [ref=e31]
  - alert [ref=e34]
```