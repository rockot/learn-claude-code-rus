"use client";

import { motion } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useTranslations } from "@/lib/i18n";

type TaskStatus = "pending" | "in_progress" | "completed";

interface TaskRow {
  id: number;
  subjectKey: string;
  status: TaskStatus;
  worktree: string;
}

interface WorktreeRow {
  name: string;
  branch: string;
  task: string;
  state: "none" | "active" | "kept" | "removed";
}

interface Lane {
  name: string;
  files: string[];
  highlight?: boolean;
}

interface StepState {
  titleKey: string;
  descKey: string;
  tasks: TaskRow[];
  worktrees: WorktreeRow[];
  lanes: Lane[];
  op: string;
}

const STEPS: StepState[] = [
  {
    titleKey: "s12_step0_title",
    descKey: "s12_step0_desc",
    op: "task_create x2",
    tasks: [
      { id: 1, subjectKey: "s12_subject_auth", status: "in_progress", worktree: "" },
      { id: 2, subjectKey: "s12_subject_ui", status: "in_progress", worktree: "" },
    ],
    worktrees: [],
    lanes: [
      { name: "main", files: ["auth/service.py", "ui/Login.tsx"], highlight: true },
      { name: "wt/auth-refactor", files: [] },
      { name: "wt/ui-login", files: [] },
    ],
  },
  {
    titleKey: "s12_step1_title",
    descKey: "s12_step1_desc",
    op: "worktree_create(name='auth-refactor', task_id=1)",
    tasks: [
      { id: 1, subjectKey: "s12_subject_auth", status: "in_progress", worktree: "auth-refactor" },
      { id: 2, subjectKey: "s12_subject_ui", status: "in_progress", worktree: "" },
    ],
    worktrees: [
      { name: "auth-refactor", branch: "wt/auth-refactor", task: "#1", state: "active" },
    ],
    lanes: [
      { name: "main", files: ["ui/Login.tsx"] },
      { name: "wt/auth-refactor", files: ["auth/service.py"], highlight: true },
      { name: "wt/ui-login", files: [] },
    ],
  },
  {
    titleKey: "s12_step2_title",
    descKey: "s12_step2_desc",
    op: "worktree_create(name='ui-login')\ntask_bind_worktree(task_id=2, worktree='ui-login')",
    tasks: [
      { id: 1, subjectKey: "s12_subject_auth", status: "in_progress", worktree: "auth-refactor" },
      { id: 2, subjectKey: "s12_subject_ui", status: "in_progress", worktree: "ui-login" },
    ],
    worktrees: [
      { name: "auth-refactor", branch: "wt/auth-refactor", task: "#1", state: "active" },
      { name: "ui-login", branch: "wt/ui-login", task: "#2", state: "active" },
    ],
    lanes: [
      { name: "main", files: [] },
      { name: "wt/auth-refactor", files: ["auth/service.py"] },
      { name: "wt/ui-login", files: ["ui/Login.tsx"], highlight: true },
    ],
  },
  {
    titleKey: "s12_step3_title",
    descKey: "s12_step3_desc",
    op: "worktree_run('auth-refactor', 'pytest tests/auth -q')",
    tasks: [
      { id: 1, subjectKey: "s12_subject_auth", status: "in_progress", worktree: "auth-refactor" },
      { id: 2, subjectKey: "s12_subject_ui", status: "in_progress", worktree: "ui-login" },
    ],
    worktrees: [
      { name: "auth-refactor", branch: "wt/auth-refactor", task: "#1", state: "active" },
      { name: "ui-login", branch: "wt/ui-login", task: "#2", state: "active" },
    ],
    lanes: [
      { name: "main", files: [] },
      { name: "wt/auth-refactor", files: ["auth/service.py", "tests/auth/test_login.py"], highlight: true },
      { name: "wt/ui-login", files: ["ui/Login.tsx", "ui/Login.css"] },
    ],
  },
  {
    titleKey: "s12_step4_title",
    descKey: "s12_step4_desc",
    op: "worktree_keep('ui-login')\nworktree_remove('auth-refactor', complete_task=true)\nworktree_events(limit=10)",
    tasks: [
      { id: 1, subjectKey: "s12_subject_auth", status: "completed", worktree: "" },
      { id: 2, subjectKey: "s12_subject_ui", status: "in_progress", worktree: "ui-login" },
    ],
    worktrees: [
      { name: "auth-refactor", branch: "wt/auth-refactor", task: "#1", state: "removed" },
      { name: "ui-login", branch: "wt/ui-login", task: "#2", state: "kept" },
    ],
    lanes: [
      { name: "main", files: [] },
      { name: "wt/auth-refactor", files: [] },
      { name: "wt/ui-login", files: ["ui/Login.tsx"], highlight: true },
    ],
  },
  {
    titleKey: "s12_step5_title",
    descKey: "s12_step5_desc",
    op: "task_list + worktree_list + worktree_events",
    tasks: [
      { id: 1, subjectKey: "s12_subject_auth", status: "completed", worktree: "" },
      { id: 2, subjectKey: "s12_subject_ui", status: "in_progress", worktree: "ui-login" },
    ],
    worktrees: [
      { name: "auth-refactor", branch: "wt/auth-refactor", task: "#1", state: "removed" },
      { name: "ui-login", branch: "wt/ui-login", task: "#2", state: "kept" },
    ],
    lanes: [
      { name: "main", files: [] },
      { name: "wt/auth-refactor", files: [] },
      { name: "wt/ui-login", files: ["ui/Login.tsx"], highlight: true },
    ],
  },
];

function statusClass(status: TaskStatus): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (status === "in_progress") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function worktreeClass(state: WorktreeRow["state"]): string {
  if (state === "active") return "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20";
  if (state === "kept") return "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-900/20";
  if (state === "removed") return "border-zinc-200 bg-zinc-100 opacity-70 dark:border-zinc-700 dark:bg-zinc-800";
  return "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900";
}

export default function WorktreeTaskIsolation({ title }: { title?: string }) {
  const t = useTranslations("viz_details");
  const vis = useSteppedVisualization({ totalSteps: STEPS.length, autoPlayInterval: 2600 });
  const step = STEPS[vis.currentStep];

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || t("s12_step5_title")}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 font-mono text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          {step.op}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-md border border-zinc-200 dark:border-zinc-700">
            <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {t("s12_task_board")}
            </div>
            <div className="space-y-2 p-2">
              {step.tasks.map((task) => (
                <motion.div
                  key={`${task.id}-${task.status}-${task.worktree}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded border border-zinc-200 p-2 text-xs dark:border-zinc-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-zinc-500 dark:text-zinc-400">#{task.id}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusClass(task.status)}`}>
                      {t(`s12_status_${task.status}`)}
                    </span>
                  </div>
                  <div className="mt-1 font-medium text-zinc-800 dark:text-zinc-100">{t(task.subjectKey)}</div>
                  <div className="mt-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                    {t("s12_worktree_label")}: {task.worktree || "-"}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 dark:border-zinc-700">
            <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {t("s12_worktree_index")}
            </div>
            <div className="space-y-2 p-2">
              {step.worktrees.length === 0 && (
                <div className="rounded border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  {t("s12_no_worktrees")}
                </div>
              )}
              {step.worktrees.map((wt) => (
                <motion.div
                  key={`${wt.name}-${wt.state}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded border p-2 text-xs ${worktreeClass(wt.state)}`}
                >
                  <div className="font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">{wt.name}</div>
                  <div className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{wt.branch}</div>
                  <div className="mt-1 text-[10px] text-zinc-600 dark:text-zinc-300">{t("s12_task_label")}: {wt.task}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 dark:border-zinc-700">
            <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {t("s12_execution_lanes")}
            </div>
            <div className="space-y-2 p-2">
              {step.lanes.map((lane) => (
                <motion.div
                  key={`${lane.name}-${lane.files.join(",")}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded border p-2 text-xs ${
                    lane.highlight
                      ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                      : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                  }`}
                >
                  <div className="font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">{lane.name}</div>
                  <div className="mt-1 space-y-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                    {lane.files.length === 0 ? (
                      <div>{t("s12_no_changes")}</div>
                    ) : (
                      lane.files.map((f) => <div key={f}>{f}</div>)
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/60">
          <div className="font-medium text-zinc-800 dark:text-zinc-100">{t(step.titleKey)}</div>
          <div className="text-zinc-600 dark:text-zinc-300">{t(step.descKey)}</div>
        </div>
      </div>

      <StepControls
        currentStep={vis.currentStep}
        totalSteps={vis.totalSteps}
        onPrev={vis.prev}
        onNext={vis.next}
        onReset={vis.reset}
        isPlaying={vis.isPlaying}
        onToggleAutoPlay={vis.toggleAutoPlay}
        stepTitle={t(step.titleKey)}
        stepDescription={t(step.descKey)}
      />
    </section>
  );
}
