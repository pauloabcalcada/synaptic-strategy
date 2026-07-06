import { Info, X } from "lucide-react"
import { Popover, Dialog } from "radix-ui"
import { infoTexts, type InfoTextKey } from "@/lib/info-texts"
import { Button } from "@/components/ui/button"

interface InfoButtonProps {
  textKey: InfoTextKey
}

export function InfoButton({ textKey }: InfoButtonProps) {
  const { title, body, mode } = infoTexts[textKey]

  const trigger = (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={title}
      className="text-muted-foreground"
    >
      <Info />
    </Button>
  )

  if (mode === "slideover") {
    return (
      <Dialog.Root>
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed top-0 right-0 flex h-full w-80 flex-col gap-3 overflow-y-auto bg-card p-4 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon-xs" aria-label="Close">
                  <X />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-muted-foreground">
              {body}
            </Dialog.Description>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="max-w-xs rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground shadow-lg"
          sideOffset={6}
        >
          <p className="mb-1 font-medium text-foreground">{title}</p>
          <p>{body}</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
