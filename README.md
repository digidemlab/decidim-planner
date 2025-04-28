# Planing Tool for Decidim


## Mermaid → Survey

This repo automatically generates an interactive form from a Mermaid diagram file (`form-definition.mmd`) and publishes the result with GitHub Pages.

## This is how it works

- Make changes to `form-definition.mmd` (example: an answer tree).
- Run `npm run build` or push to GitHub - a GitHub Action will automatically build the form.
- The result is published on `https://<username>.github.io/<repo>`.

## Example of Mermaid code

````mermaid
graph LR
    Q1[1 Type of process] --> B{Does the process have timed steps?}
    B -->|Yes| C[Create a Process]
    B -->|No| D[Create a Consultation]
