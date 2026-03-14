import React from 'react';
import AppBar from '@mui/material/AppBar';
import { NavbarSelector } from './NavbarSelector';
import { NavBarTabs } from './NavbarTabs';
import { NavBarReload } from './NavbarReload';

export const NavBar = (): JSX.Element => {
  return (
    <AppBar
      sx={{
        height: '40px',
        position: 'relative',
        backgroundColor: '#0d0d1a',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        '&> a  ': { textDecoration: 'none' },
      }}
    >
      <NavbarSelector />
      <NavBarTabs />

      <NavBarReload />
    </AppBar>
  );
};
