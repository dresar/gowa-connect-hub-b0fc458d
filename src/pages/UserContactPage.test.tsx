import { describe, it, expect } from 'vitest';

import UserContactPage from './UserContactPage';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import React from 'react';

describe('UserContactPage', () => {
  it('renders without crashing', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/user']}>
        <UserContactPage />
      </MemoryRouter>
    );
    expect(getByText('User & Contact Tools')).toBeTruthy();
  });
});
