import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ChevronRight, Trash2, Layers, Pencil, PowerOff, Archive, RotateCcw, Settings } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { useConfirm } from "@/components/ui/confirm-context";
import { ServicesListSkeleton } from "@/components/skeletons";
import { servicesApi } from "@/api/services.api";
import { offeringsApi } from "@/api/offerings.api";

export function ServicesListPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [offeringsByService, setOfferingsByService] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const confirm = useConfirm();

  const load = async () => {
    try {
      const [servicesRes, offeringsRes] = await Promise.all([
        servicesApi.list(),
        offeringsApi.list().catch(() => ({ data: { data: { offerings: [] } } })),
      ]);
      setServices(servicesRes.data.data.services);
      const grouped = {};
      for (const offering of offeringsRes.data.data.offerings ?? []) {
        const key = offering.serviceId;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(offering);
      }
      setOfferingsByService(grouped);
    } catch (err) {
      toast.error(err.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await servicesApi.create({ name, description });
      toast.success("Service created");
      setName("");
      setDescription("");
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to create service");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (service) => {
    const hint =
      service.offeringCount > 0
        ? `\n\nThis service has ${service.offeringCount} offering(s). Delete those first.`
        : "";
    const ok = await confirm({
      title: `Delete "${service.name}"?`,
      description: `This cannot be undone. Uploaded knowledge documents will also be removed.${hint}`,
      confirmLabel: "Delete service",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await servicesApi.remove(service.id);
      toast.success("Service deleted");
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to delete service");
    }
  };

  const openEdit = (service) => {
    setEditingService(service);
    setEditName(service.name);
    setEditDescription(service.description ?? "");
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingService) return;
    setSubmitting(true);
    try {
      await servicesApi.update(editingService.id, {
        name: editName,
        description: editDescription,
      });
      toast.success("Service updated");
      setEditingService(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to update service");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (service, status) => {
    const labels = { disabled: "disable", archived: "archive", draft: "reactivate" };
    const ok = await confirm({
      title: `${labels[status] ?? status} "${service.name}"?`,
      confirmLabel: labels[status] ?? status,
      variant: status === "archived" ? "danger" : "default",
    });
    if (!ok) return;
    try {
      await servicesApi.update(service.id, { status });
      toast.success(`Service ${status === "draft" ? "reactivated" : status}`);
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to update service status");
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-bright mb-2">
              Configuration
            </p>
            <h1 className="text-2xl font-bold text-heading tracking-tight sm:text-3xl">
              Services
            </h1>
            <p className="mt-1.5 text-sm text-label">
              High-level administrative processes for your institute
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary-hover shadow-[0_2px_10px_rgba(10,102,64,0.28)] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(10,102,64,0.36)] hover:from-primary-hover hover:to-heading sm:w-auto sm:px-5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New service
          </button>
        </div>

        <Drawer
          open={showForm}
          title="Create new service"
          description="Add a high-level process such as Admission, Fee Payment, or Certificate Request."
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-label uppercase tracking-wide">
                Service name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Admission"
                required
                className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-2.5 text-sm text-heading placeholder-placeholder outline-none transition-all duration-200 hover:border-mint hover:bg-input-hover-bg focus:border-mint focus:bg-white focus:ring-2 focus:ring-mint/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-label uppercase tracking-wide">
                Description
                <span className="ml-1 normal-case font-normal text-placeholder">
                  (optional)
                </span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this service"
                rows={5}
                className="min-h-32 w-full resize-y rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-heading placeholder-placeholder outline-none transition-all duration-200 hover:border-mint hover:bg-input-hover-bg focus:border-mint focus:bg-white focus:ring-2 focus:ring-mint/20"
              />
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary-hover shadow-[0_2px_10px_rgba(10,102,64,0.28)] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(10,102,64,0.36)] disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
              >
                {submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create service"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary border border-input-border bg-white transition-all duration-200 hover:bg-input-bg hover:border-mint sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </Drawer>

        <Drawer
          open={Boolean(editingService)}
          title="Edit service"
          description="Update service name and description."
          onClose={() => setEditingService(null)}
        >
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-label uppercase tracking-wide">
                Service name
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-2.5 text-sm text-heading outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-label uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-heading outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary-hover disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </form>
        </Drawer>

        {loading ? (
          <ServicesListSkeleton />
        ) : services.length === 0 ? (
          <div className="rounded-2xl border border-input-border bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)] px-7 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-mint-pale to-mint-light">
              <Layers className="h-6 w-6 text-primary" strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-heading">
              No services yet
            </p>
            <p className="mt-1 text-sm text-label">
              Create your first service to begin configuring offerings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => {
              const childOfferings = offeringsByService[service.id] ?? [];
              return (
              <div
                key={service.id}
                className="rounded-2xl border border-input-border bg-white/85 shadow-[0_2px_12px_rgba(10,102,64,0.05)] transition-all duration-300 hover:border-mint hover:shadow-[0_4px_20px_rgba(10,102,64,0.10)]"
              >
                <div className="group flex items-center gap-1 sm:gap-2">
                <Link
                  to={`/admin/services/${service.id}`}
                  className="flex min-w-0 flex-1 items-center justify-between px-4 py-4 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mint-pale to-mint-light border border-input-border group-hover:from-mint-light group-hover:to-mint transition-all duration-300">
                      <Layers
                        className="h-4.5 w-4.5 text-primary"
                        strokeWidth={2}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-heading">
                          {service.name}
                        </p>
                        <Badge variant={service.status}>{service.status}</Badge>
                        {service.isSystem && <Badge variant="outline">System</Badge>}
                      </div>
                      {service.description && (
                        <p className="mt-0.5 text-sm text-label line-clamp-1">
                          {service.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-text-muted">
                        {service.offeringCount} offering
                        {service.offeringCount !== 1 ? "s" : ""}
                        {service.activeOfferingCount > 0 &&
                          ` · ${service.activeOfferingCount} active`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className="ml-2 h-5 w-5 shrink-0 text-placeholder group-hover:text-primary transition-colors duration-200"
                    strokeWidth={2}
                  />
                </Link>
                {!service.isSystem && (
                  <div className="mr-3 flex shrink-0 items-center gap-1 sm:mr-4">
                    <button
                      onClick={() => openEdit(service)}
                      title="Edit service"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-label transition hover:bg-input-bg hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} />
                    </button>
                    {service.status === "active" && (
                      <button
                        onClick={() => handleStatusChange(service, "disabled")}
                        title="Disable service"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-label transition hover:bg-input-bg hover:text-amber-solid"
                      >
                        <PowerOff className="h-4 w-4" strokeWidth={2} />
                      </button>
                    )}
                    {service.status !== "archived" && service.status !== "active" && (
                      <button
                        onClick={() => handleStatusChange(service, "archived")}
                        title="Archive service"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-label transition hover:bg-red-50 hover:text-error"
                      >
                        <Archive className="h-4 w-4" strokeWidth={2} />
                      </button>
                    )}
                    {(service.status === "disabled" || service.status === "archived") && (
                      <button
                        onClick={() => handleStatusChange(service, "draft")}
                        title="Reactivate service"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-label transition hover:bg-input-bg hover:text-primary"
                      >
                        <RotateCcw className="h-4 w-4" strokeWidth={2} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(service)}
                      title="Delete service"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-icon-disabled border border-transparent transition-all duration-200 hover:border-error-border-strong hover:bg-red-50 hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                )}
                </div>

                {childOfferings.length > 0 && (
                  <ul className="space-y-2 border-t border-divider bg-row-hover px-4 py-3 sm:px-6">
                    {childOfferings.map((offering) => (
                      <li key={offering.id}>
                        <div className="flex items-center gap-2 rounded-xl border border-input-border bg-white px-3 py-2.5 sm:px-4">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/admin/offerings/${offering.id}/configure`)
                            }
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span className="h-8 w-0.5 shrink-0 rounded-full bg-mint" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-heading">
                                  {offering.name}
                                </p>
                                <Badge variant={offering.status}>{offering.status}</Badge>
                              </div>
                              <p className="mt-0.5 text-xs text-text-muted">
                                Offering
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            title="Edit offering"
                            onClick={() =>
                              navigate(`/admin/offerings/${offering.id}/configure`)
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-label transition hover:bg-input-bg hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            title="Configure offering"
                            onClick={() =>
                              navigate(`/admin/offerings/${offering.id}/configure`)
                            }
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-input-bg"
                          >
                            <Settings className="h-3.5 w-3.5" strokeWidth={2} />
                            Open
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
