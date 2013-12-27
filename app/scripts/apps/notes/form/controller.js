/* global define */
define([
    'underscore',
    'app',
    'marionette',
    'collections/notes', 'collections/tags', 'collections/notebooks',
    'models/note',
    'apps/notes/form/formView'
], function (_, App, Marionette, NotesCollection, TagsCollection, NotebooksCollection, NoteModel, View) {
    'use strict';

    var Form = App.module('AppNote.Form');

    Form.Controller = Marionette.Controller.extend({
        initialize: function () {
            _.bindAll(this, 'addForm', 'editForm', 'show');
            App.trigger('notes:show', {filter: null, page: null});
        },

        /**
         * Add a new note
         */
        addForm: function () {
            this.tags = new TagsCollection();
            this.notebooks = new NotebooksCollection();
            this.model = new NoteModel();

            $.when(
                this.tags.fetch({ limit : 100 }),
                this.notebooks.fetch()
            ).done(this.show);
        },

        /**
         * Edit an existing note
         */
        editForm: function (args) {
            this.tags = new TagsCollection();
            this.notebooks = new NotebooksCollection();
            this.model = new NoteModel({id: args.id});

            $.when(this.tags.fetch(), this.notebooks.fetch(),
                   this.model.fetch()).done(this.show);
        },

        show: function () {
            var view, decrypted;

            decrypted = {
                title : App.Encryption.API.decrypt(this.model.get('title')),
                content : App.Encryption.API.decrypt(this.model.get('content')),
            };

            view = new View({
                model     : this.model,
                decrypted : decrypted,
                tags      : this.tags,
                notebooks : this.notebooks
            });

            App.content.show(view);

            this.model.on('save', this.save, this);
            view.on('redirect', this.redirect, this);
            view.trigger('shown');
        },

        redirect: function () {
            App.navigateBack();
            return false;
        },

        save: function (data) {
            // Encryption
            data.title = App.Encryption.API.encrypt(data.title);
            data.content = App.Encryption.API.encrypt(data.content);
            
            if (data.notebookID) {
                data.notebookId = this.notebooks.get(data.notebookId).get('id');
            }

            // Add new tags
            this.tags.saveAdd(data.tags);

            // Save
            this.model.save(data, {
                success: function (model) {
                    var url = '/notes/show/' + model.get('id');
                    App.navigate(url, {trigger: true});
                }
            });

            App.trigger('notes:added');
        }

    });

    return Form.Controller;
});