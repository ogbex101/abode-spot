import { createFileRoute } from "@tanstack/react-router";
import { AdminCreatePropertyForm } from "@/components/property/AdminCreatePropertyForm";

export const Route = createFileRoute("/_authenticated/_admin/admin/add-property")({
  component: AdminCreatePropertyForm,
});
