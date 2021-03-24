module.exports = {
  extends: ['@commitlint/config-lerna-scopes', '@commitlint/config-conventional'],
  rules: {
    'scope-enum': async _ => [2, 'always', ['solidity']],
    'subject-case': [0]
  }
};
