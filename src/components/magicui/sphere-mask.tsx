import { cn } from "@/lib/utils";

export const SphereMask = ({ reverse = false }: { reverse?: boolean }) => {
  return (
    <div
      className={cn(
        // color
        "[--color:#fd7c21]",
        "pointer-events-none relative -z-[2] mx-auto h-[50rem] overflow-hidden",

        // no mask - solid black sphere

        // reverse
        reverse ? "my-[-22rem] rotate-180 md:mt-[-30rem]" : "my-[-18.8rem]",

        // before
        "before:absolute before:inset-0 before:h-full before:w-full before:opacity-100 before:[background-image:radial-gradient(circle_at_bottom_center,var(--color)_0%,var(--color)_20%,transparent_60%)]",

        // after
        "after:absolute after:-left-1/2 after:top-1/2 after:aspect-[1/0.7] after:w-[200%] after:rounded-[50%] after:border-t after:border-gray-800 after:bg-black"
      )}
    ></div>
  );
};
