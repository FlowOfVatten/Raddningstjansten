import { useAppStore } from './store/useAppStore'
import LoginScreen from './screens/LoginScreen'
import ListsScreen from './screens/ListsScreen'
import ListScreen from './screens/ListScreen'

export default function App() {
  const screen = useAppStore((s) => s.screen)

  switch (screen) {
    case 'login':    return <LoginScreen />
    case 'lists':    return <ListsScreen />
    case 'list':     return <ListScreen />
    default:         return <ListsScreen />
  }
}
