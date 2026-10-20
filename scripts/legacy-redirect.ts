// Preserve previously published links after the authorized project rename.
export default {
  fetch(request: Request): Response {
    const target = new URL(request.url);
    target.hostname = 'arnav-space-simulation.arnavrival12.workers.dev';
    target.protocol = 'https:';
    target.port = '';
    return Response.redirect(target.toString(), 308);
  },
};
