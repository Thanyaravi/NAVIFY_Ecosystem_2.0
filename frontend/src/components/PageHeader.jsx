import React from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/components/GlassCard";

export const PageHeader = ({ title, subtitle, action }) => (
  <motion.div
    variants={fadeUp}
    className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
  >
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
    {action}
  </motion.div>
);
