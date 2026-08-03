"use client";

import type { ReactNode } from "react";
import type { Section, Shortcut } from "@/lib/newtab/types";

export type TileMenuActions = {
  onEdit: () => void;
  onDelete: () => void;
  onMoveTo: (sectionId: string) => void;
};

type Components = {
  Item: (props: {
    onSelect: () => void;
    destructive?: boolean;
    children: ReactNode;
  }) => ReactNode;
  Separator: () => ReactNode;
  Sub: (props: { label: string; children: ReactNode }) => ReactNode;
};

type Props = {
  shortcut: Shortcut;
  sections: Section[];
  currentSectionId: string;
  actions: TileMenuActions;
  components: Components;
};

export function tileMenuItems({
  sections,
  currentSectionId,
  actions,
  components: { Item, Separator, Sub },
}: Props): ReactNode {
  const otherSections = sections.filter((s) => s.id !== currentSectionId);

  return (
    <>
      <Item onSelect={actions.onEdit}>edit</Item>
      <Sub label="move to">
        {otherSections.length === 0 ? (
          <Item onSelect={() => {}}>(no other sections)</Item>
        ) : (
          otherSections.map((s) => (
            <Item key={s.id} onSelect={() => actions.onMoveTo(s.id)}>
              {s.name ?? "default"}
            </Item>
          ))
        )}
      </Sub>
      <Separator />
      <Item destructive onSelect={actions.onDelete}>
        delete
      </Item>
    </>
  );
}
