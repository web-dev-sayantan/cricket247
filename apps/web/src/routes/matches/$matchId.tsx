import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/matches/$matchId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/matches/$matchId"!</div>
}
