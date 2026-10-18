import type { AuthWallCopy } from '@/lib/authSheetRef'

/** Sign-in wall copy for signed-out actions (design R4, M2, P3b, A5). */
export const AUTH_WALL = {
  likeComment: {
    title: 'Sign in to like and comment',
    subtitle: 'You’ll come straight back to this review.',
  },
  saveCheckin: {
    title: 'Sign in to save places',
    subtitle: 'Keep a To-Dine list and track where you’ve checked in.',
  },
  follow: {
    title: 'Sign in to follow',
    subtitle: 'See their reviews, comments and check-ins in Activity.',
  },
  profile: {
    title: 'Sign in to see profiles',
    subtitle: 'Follow palates like yours and see what they’re eating.',
  },
  report: {
    title: 'Sign in to report or block',
    subtitle: 'You’ll come straight back here.',
  },
} satisfies Record<string, AuthWallCopy>
